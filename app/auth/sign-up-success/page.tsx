import Image from 'next/image'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Page() {
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
                Cadastro realizado!
              </CardTitle>
              <CardDescription>Verifique seu email para confirmar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Você se cadastrou com sucesso. Verifique seu email para
                confirmar sua conta antes de entrar.
              </p>
              <Button asChild className="w-full">
                <Link href="/auth/login">Ir para Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
