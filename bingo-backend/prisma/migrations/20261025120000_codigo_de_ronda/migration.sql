-- La ronda gana un codigo de 4 letras: es lo que separa un auditorio del otro.
-- Las rondas viejas se quedan con cadena vacia; ya estan cerradas y nadie va a
-- entrar a ellas.
ALTER TABLE "Round" ADD COLUMN "code" TEXT NOT NULL DEFAULT '';
