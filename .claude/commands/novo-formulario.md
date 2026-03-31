Crie um formulario completo com validacao, secoes e responsividade no padrao SISAM.

Entrada: $ARGUMENTS (nome e campos do formulario)
Exemplo: "Aluno campos:nome,email,serie,escola_id(select),pcd(checkbox),observacoes(textarea)"

## Estrutura do Formulario

### 1. Componente Campo reutilizavel
```tsx
interface CampoProps {
  label: string
  valor: any
  campo: string
  editando: boolean
  form: Record<string, any>
  updateForm: (campo: string, valor: any) => void
  tipo?: 'text' | 'email' | 'date' | 'number' | 'textarea' | 'boolean'
  opcoes?: { value: string; label: string }[]
  icon?: LucideIcon
  obrigatorio?: boolean
  placeholder?: string
}
```

Suporta: text, email, date, number, select, textarea, checkbox.
Modo leitura vs edicao controlado por `editando`.

### 2. Componente Secao
```tsx
<Secao titulo="Dados Pessoais" icon={User} cor="indigo">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
    <Campo label="Nome" campo="nome" ... />
    <Campo label="Email" campo="email" tipo="email" ... />
  </div>
</Secao>
```

Cores disponiveis: indigo, blue, purple, orange, green, red.

### 3. Classes padrao de input
```
Input:    w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent
Label:    block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1
Select:   mesmas classes do input
Textarea: mesmas classes + resize-y
Checkbox: rounded border-gray-300 text-indigo-600 focus:ring-indigo-500
```

### 4. Validacao com Zod
```typescript
const formSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatorio').max(255),
  email: z.string().email('Email invalido'),
  serie: z.string().optional().nullable(),
  escola_id: z.string().uuid('Selecione uma escola'),
  pcd: z.boolean().default(false),
  observacoes: z.string().max(2000).optional().nullable(),
})
```

### 5. Estado do formulario
```typescript
const [formData, setFormData] = useState({ nome: '', email: '', ... })
const [erros, setErros] = useState<Record<string, string>>({})
const [salvando, setSalvando] = useState(false)

const updateForm = (campo: string, valor: any) => {
  setFormData(prev => ({ ...prev, [campo]: valor }))
  setErros(prev => ({ ...prev, [campo]: '' })) // limpar erro ao editar
}

const validar = () => {
  const result = formSchema.safeParse(formData)
  if (!result.success) {
    const novosErros: Record<string, string> = {}
    result.error.errors.forEach(err => { novosErros[err.path[0] as string] = err.message })
    setErros(novosErros)
    return false
  }
  return true
}
```

### 6. Botoes de acao
```tsx
<div className="flex justify-end gap-3 pt-4">
  <button onClick={cancelar} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
    Cancelar
  </button>
  <button onClick={salvar} disabled={salvando} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
    <Save className="w-4 h-4" />
    {salvando ? 'Salvando...' : 'Salvar'}
  </button>
</div>
```

### 7. Formulario grande (padrao SISAM)
Para formularios principais, usar inputs maiores:
```
py-4 sm:py-5 text-base sm:text-lg
```
Container sem max-w restritivo: `w-full max-w-none`
