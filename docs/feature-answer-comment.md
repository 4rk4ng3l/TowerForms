# Feature: Campo Comment para Answers

## Descripcion

Se agregó la funcionalidad para que cada respuesta (Answer) pueda tener un comentario opcional asociado. Este campo permite a los usuarios agregar notas o aclaraciones a sus respuestas en los formularios.

## Cambios Realizados

### Backend (TowerFormsBackEnd)

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Campo `answerComment` con `@db.VarChar(1028)` |
| `src/domain/entities/answer.entity.ts` | Agregado campo `comment: string \| null` a la entidad |
| `src/infrastructure/persistence/postgresql/repositories/submission.repository.ts` | Guarda y lee el campo `answerComment` en create, update y toDomain |
| `src/application/commands/sync/sync-submissions.command.ts` | DTO actualizado con campo `answerComment?: string` |
| `src/application/commands/sync/sync-submissions.handler.ts` | Pasa el comment al crear answers via `Answer.create()` |

### Frontend (TowerForms)

| Archivo | Cambio |
|---------|--------|
| `app/src/core/entities/Submission.ts` | Interface `Answer` con campo `comment?: string \| null` |
| `app/src/core/use-cases/submissions/SyncSubmissionsUseCase.ts` | Incluye `answerComment` en el DTO de sincronizacion |
| `app/src/infrastructure/database/migrations.ts` | Nueva migracion v6 para agregar columna `comment` a tabla answers |
| `app/src/data/repositories/SQLiteSubmissionRepository.ts` | Insert, update y read del campo comment |

## Estructura del Campo

```typescript
// Frontend - Interface Answer
interface Answer {
  questionId: string;
  value: string | string[] | number | null;
  comment?: string | null;  // NUEVO
  fileIds?: string[];
}

// Backend - Entity Answer
class Answer {
  constructor(
    public readonly id: string,
    public readonly submissionId: string,
    public readonly questionId: string,
    public readonly value: AnswerValue,
    public readonly comment: string | null,  // NUEVO
    public readonly createdAt: Date
  ) {}
}
```

## Base de Datos

### PostgreSQL (Backend)
```sql
-- Tabla answers
answer_comment VARCHAR(1028) NULL
```

### SQLite (Frontend)
```sql
-- Tabla answers
comment TEXT NULL
```

## Pasos de Instalacion

### 1. Migrar Base de Datos Backend
```bash
cd /home/usuario-hp/Desarrollos/TowerFormsBackEnd
npx prisma migrate dev --name add_answer_comment
```

### 2. Reinstalar App en Dispositivo
La migracion SQLite v6 se ejecutara automaticamente al iniciar la app.

## Flujo de Datos

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Usuario   │───>│   Frontend   │───>│   Backend   │
│  (comment)  │    │   (SQLite)   │    │ (PostgreSQL)│
└─────────────┘    └──────────────┘    └─────────────┘
                          │                    │
                          ▼                    ▼
                   answers.comment      answer_comment
```

## Uso en Sincronizacion

El campo `comment` se sincroniza automaticamente como parte del DTO de submission:

```typescript
// DTO enviado al backend
{
  answers: [
    {
      id: "uuid",
      questionId: "uuid",
      answerText: "valor",
      answerComment: "comentario opcional"  // Se incluye si existe
    }
  ]
}
```

## Fecha de Implementacion

2026-01-18
