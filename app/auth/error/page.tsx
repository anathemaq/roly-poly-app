import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function AuthErrorPage() {
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
                <div className="rounded-full bg-destructive/20 p-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl text-foreground">Ошибка авторизации</CardTitle>
              <CardDescription className="text-muted-foreground">
                Что-то пошло не так при авторизации
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Попробуйте войти снова или зарегистрируйтесь, если у вас нет аккаунта
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/auth/login"
                  className="text-primary underline underline-offset-4 hover:text-primary/80 text-sm"
                >
                  Попробовать снова
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="text-muted-foreground underline underline-offset-4 hover:text-foreground text-sm"
                >
                  Зарегистрироваться
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
