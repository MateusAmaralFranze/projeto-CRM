import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import * as express from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  // bodyParser desligado no Nest para configurarmos o nosso próprio com "verify",
  // que é o que nos dá acesso ao corpo bruto (necessário para validar a assinatura HMAC dos webhooks).
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(
    express.json({
      limit: "2mb",
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  app.enableCors({
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3333;
  await app.listen(port);
  console.log(`API rodando em http://localhost:${port}`);
}

bootstrap();
