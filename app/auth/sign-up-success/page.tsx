import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Mail } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex justify-center">
            <Image
              src="/icons/icon-192x192.png"
              alt="Roly-Poly"
              width={80}
              height={80}
              className="rounded-2xl"
            />
          </div>
          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/20 p-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl text-foreground">Проверьте почту</CardTitle>
              <CardDescription className="text-muted-foreground">
                Мы отправили вам письмо с ссылкой для подтверждения аккаунта
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                После подтверждения email вы сможете войти в приложение
              </p>
              <Link
                href="/auth/login"
                className="text-primary underline underline-offset-4 hover:text-primary/80 text-sm"
              >
                Вернуться на страницу входа
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
