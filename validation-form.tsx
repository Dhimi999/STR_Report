"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { CheckCircle2 } from 'lucide-react'
import { BackgroundPattern } from '@/components/BackgroundPattern'
import { motion, AnimatePresence } from 'framer-motion'

const typeColors = {
  BARU: "bg-blue-200 hover:bg-blue-300 text-blue-800",
  NAIK: "bg-purple-200 hover:bg-purple-300 text-purple-800",
  TURUN: "bg-purple-600 hover:bg-purple-700 text-white",
  RPL: "bg-teal-700 hover:bg-teal-800 text-white",
  ALIH: "bg-amber-700 hover:bg-amber-800 text-white"
} as const

const statusColors = {
  SETUJU: "bg-green-200 hover:bg-green-300 text-green-800",
  REVISI: "bg-yellow-100 hover:bg-yellow-200 text-yellow-800",
  DITOLAK: "bg-red-500 hover:bg-red-600 text-white",
  SKIP: "bg-gray-600 hover:bg-gray-700 text-white"
} as const

const verifikatorColors = {
  Vigo: "bg-[#7fa8b3] text-white hover:bg-[#5a8995]",
  Dhimas: "bg-[#ff9966] text-white hover:bg-[#ff7733]"
} as const

const tindakLanjutColors = {
  Submit: "bg-black text-white hover:bg-gray-800",
  "Bu Yuni": "bg-[#11734b] text-white hover:bg-[#0d5c3d]",
  "PENDING!": "bg-red-500 text-white hover:bg-red-600"
} as const

const correctionColors = {
  SETUJU: "bg-green-100",
  REVISI: "bg-yellow-50",
  DITOLAK: "bg-red-50",
  SKIP: "bg-gray-900 text-white",
  DEFAULT: "bg-white"
} as const

export default function ValidationForm() {
  const [doubleCheckEnabled, setDoubleCheckEnabled] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [maintainVerifikator, setMaintainVerifikator] = useState(false)
  const [savedVerifikator, setSavedVerifikator] = useState<string | undefined>()
  const [showIncompleteFieldsDialog, setShowIncompleteFieldsDialog] = useState(false)
  const incompleteFieldsRef = useRef<string[]>([])

  const formSchema = z.object({
    ktp: z.string().min(16, {
      message: "No. KTP harus 16 digit.",
    }).max(16),
    name: z.string().min(2, {
      message: "Nama harus diisi minimal 2 karakter.",
    }),
    type: z.enum(["BARU", "NAIK", "TURUN", "RPL", "ALIH"]),
    status: z.enum(["SETUJU", "REVISI", "DITOLAK", "SKIP"]),
    correction: z.string(),
    verifier: z.enum(["Vigo", "Dhimas"]),
    followUp: z.enum(["Submit", "Bu Yuni", "PENDING!"])
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ktp: "",
      name: "",
      type: undefined,
      status: undefined,
      correction: "",
      verifier: undefined,
      followUp: undefined
    },
  })

  const watchType = form.watch("type")
  const watchStatus = form.watch("status")

  useEffect(() => {
    if (["RPL", "ALIH"].includes(watchType || '')) {
      form.setValue("status", "SKIP")
      form.setValue("followUp", "Bu Yuni")
    }
  }, [watchType, form])

  useEffect(() => {
    if (maintainVerifikator && savedVerifikator) {
      form.setValue("verifier", savedVerifikator as "Vigo" | "Dhimas");
    }
  }, [maintainVerifikator, savedVerifikator, form]);

  const validateCorrection = (correction: string) => {
    if (["REVISI", "DITOLAK"].includes(watchStatus || '') && !correction) {
      return "Koreksi harus diisi untuk status Revisi atau Ditolak"
    }
    return true
  }

  const checkIncompleteFields = () => {
    const incompleteFields: string[] = []
    if (!form.getValues("ktp")) incompleteFields.push("No. KTP")
    if (!form.getValues("name")) incompleteFields.push("Nama Lengkap")
    if (!form.getValues("type")) incompleteFields.push("Jenis")
    if (!form.getValues("status")) incompleteFields.push("Status")
    if (!form.getValues("verifier")) incompleteFields.push("Verifikator")
    if (!form.getValues("followUp")) incompleteFields.push("Tindak Lanjut")
    if (["REVISI", "DITOLAK"].includes(form.getValues("status") || '') && !form.getValues("correction")) {
      incompleteFields.push("Koreksi")
    }
    return incompleteFields
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const incompleteFields = checkIncompleteFields()
    if (incompleteFields.length > 0) {
      incompleteFieldsRef.current = incompleteFields
      setShowIncompleteFieldsDialog(true)
      return
    }

    if (doubleCheckEnabled) {
      setShowConfirmDialog(true)
    } else {
      await submitForm(values)
    }

    if (maintainVerifikator) {
      setSavedVerifikator(values.verifier);
    }
  }

  async function submitForm(values: z.infer<typeof formSchema>) {
    try {
      const formData = new FormData()
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(`entry.${getEntryId(key)}`, value)
        }
      })
      
      await fetch(
        "https://docs.google.com/forms/d/e/1FAIpQLSchYVi1MwfYLaQpAkA3paDe7ifaCWYB3ikqiDMEmGUkg9Aukg/formResponse",
        {
          method: "POST",
          mode: "no-cors",
          body: formData,
        }
      )

      setShowSuccessDialog(true)
      
      // Reset the form while preserving the verifier if maintainVerifikator is true
      const currentVerifier = form.getValues("verifier");
      form.reset();
      if (maintainVerifikator && currentVerifier) {
        form.setValue("verifier", currentVerifier);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "There was a problem submitting your form.",
        variant: "destructive",
      })
    }
  }

  function getEntryId(field: string) {
    const entryIds = {
      ktp: "322904331",
      name: "1063142045",
      type: "1377005628",
      status: "1455185242",
      correction: "169990671",
      verifier: "1557940133",
      followUp: "975687110"
    }
    return entryIds[field as keyof typeof entryIds]
  }

  return (
    <div className="min-h-screen bg-[url('https://indieground.net/wp-content/uploads/2023/03/Freebie-GradientTextures-Preview-02.jpg')] bg-cover bg-center p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <CardTitle className="text-2xl font-bold text-center">
                Formulir Input Data Validasi STR
              </CardTitle>
            </motion.div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="p-6 bg-gray-100 rounded-lg space-y-4">
                  <FormField
                    control={form.control}
                    name="ktp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-bold">No. KTP</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan nomor KTP" className="bg-white" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-bold">Nama Lengkap</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan nama lengkap" className="bg-white" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-gray-100 rounded-lg">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-bold text-center block mb-4">Jenis</FormLabel>
                          <div className="space-y-2">
                            {Object.entries(typeColors).map(([type, colorClass]) => (
                              <Button
                                key={type}
                                type="button"
                                className={cn(
                                  "w-full rounded-full font-medium",
                                  colorClass,
                                  field.value === type ? "ring-2 ring-offset-2 ring-black" : ""
                                )}
                                onClick={() => field.onChange(type)}
                              >
                                {type}
                              </Button>
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-6 bg-gray-100 rounded-lg">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-bold text-center block mb-4">Status</FormLabel>
                          <div className="space-y-2">
                            {Object.entries(statusColors).map(([status, colorClass]) => (
                              <Button
                                key={status}
                                type="button"
                                className={cn(
                                  "w-full rounded-full font-medium",
                                  colorClass,
                                  field.value === status ? "ring-2 ring-offset-2 ring-black" : ""
                                )}
                                onClick={() => field.onChange(status)}
                                disabled={["RPL", "ALIH"].includes(watchType || '') && status !== "SKIP"}
                              >
                                {status}
                              </Button>
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="correction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-bold">Koreksi</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={watchStatus === "REVISI" || watchStatus === "DITOLAK" ? "Masukkan koreksi" : ""}
                          className={cn(
                            "resize-none",
                            correctionColors[watchStatus as keyof typeof correctionColors] || correctionColors.DEFAULT
                          )}
                          disabled={watchStatus === "SETUJU" || watchStatus === "SKIP"}
                          required={watchStatus === "REVISI" || watchStatus === "DITOLAK"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="verifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-bold">Verifikator</FormLabel>
                      <div className="flex gap-4">
                        {Object.entries(verifikatorColors).map(([verifier, colorClass]) => (
                          <Button
                            key={verifier}
                            type="button"
                            className={cn(
                              "flex-1 transition-all duration-200",
                              colorClass,
                              field.value === verifier ? "ring-2 ring-offset-2 ring-black" : ""
                            )}
                            onClick={() => {
                              field.onChange(verifier);
                              if (maintainVerifikator) {
                                setSavedVerifikator(verifier);
                              }
                            }}
                          >
                            {verifier}
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Checkbox
                          id="maintainVerifikator"
                          checked={maintainVerifikator}
                          onCheckedChange={(checked) => {
                            setMaintainVerifikator(checked as boolean);
                            if (checked) {
                              setSavedVerifikator(field.value);
                            } else {
                              setSavedVerifikator(undefined);
                            }
                          }}
                        />
                        <label
                          htmlFor="maintainVerifikator"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Pertahankan User ini untuk Sesi Ini
                        </label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <QuestionMarkCircledIcon className="h-4 w-4 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Jika diaktifkan, maka Verifikator yang dipilih akan digunakan terus-menerus untuk pengisian berikutnya hingga fitur ini dinonaktifkan</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="followUp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-bold">Tindak Lanjut</FormLabel>
                      <div className="flex gap-4">
                        {Object.entries(tindakLanjutColors).map(([followUp, colorClass]) => (
                          <Button
                            key={followUp}
                            type="button"
                            className={cn(
                              "flex-1 transition-all duration-200",
                              colorClass,
                              field.value === followUp ? "ring-2 ring-offset-2 ring-black" : "opacity-70"
                            )}
                            onClick={() => field.onChange(followUp)}
                            disabled={["RPL", "ALIH"].includes(watchType || '') && followUp !== "Bu Yuni"}
                          >
                            {followUp}
                          </Button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">Submit</Button>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="doubleCheck"
                    checked={doubleCheckEnabled}
                    onCheckedChange={(checked) => setDoubleCheckEnabled(checked as boolean)}
                  />
                  <label
                    htmlFor="doubleCheck"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Aktifkan Pemberitahuan Cek Ganda
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <QuestionMarkCircledIcon className="h-4 w-4 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Jika diaktifkan, maka setiap kali Anda melakukan Submit, akan muncul Pop Up terlebih dahulu sebelum data benar-benar dikirim</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Pastikan semua informasi yang Anda isi sudah benar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowConfirmDialog(false)
              submitForm(form.getValues())
            }}>
              Yakin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showIncompleteFieldsDialog} onOpenChange={setShowIncompleteFieldsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Peringatan: Isian Belum Lengkap</AlertDialogTitle>
            <AlertDialogDescription>
              Mohon lengkapi isian berikut sebelum melanjutkan:
              <ul className="list-disc list-inside mt-2">
                {incompleteFieldsRef.current.map((field, index) => (
                  <li key={index}>{field}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowIncompleteFieldsDialog(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Data berhasil diinput</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex items-center justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSuccessDialog(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

