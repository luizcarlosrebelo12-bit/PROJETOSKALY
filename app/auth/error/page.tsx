import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-primary/10 to-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/logo.png"
            alt="KM Logo"
            width={80}
            height={80}
            className="rounded-xl shadow-lg"
          />
          <Card className="w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                Ops, algo deu errado.
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {params?.error ? (
                <p className="text-sm text-muted-foreground text-center">
                  Código do erro: {params.error}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  Ocorreu um erro não especificado.
                </p>
              )}
              <Button asChild className="w-full">
                <Link href="/auth/login">Voltar para Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
