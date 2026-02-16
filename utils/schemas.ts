import { z } from 'zod';

export const ClientSchema = z.object({
    companyName: z.string().min(1, "Nome da empresa é obrigatório"),
    cnpj: z.string().optional(),
    address: z.string().min(5, "Endereço inválido"),
    contactName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    category: z.string().or(z.array(z.string())).optional(),
    status: z.enum(['Ativo', 'Inativo', 'Prospeccao']).optional().default('Ativo'),
    lat: z.number().optional(),
    lng: z.number().optional(),
});

export const ProductSchema = z.object({
    name: z.string().default(''),
    price: z.number().nonnegative().default(0),
    category: z.string().default('Geral'),
    sku: z.string().optional(),
    brand: z.string().default('Genérico'),
    factoryCode: z.string().optional(),
    margin: z.number().optional(),
    discount: z.number().optional(),
});

export type ValidatedClient = z.infer<typeof ClientSchema>;
export type ValidatedProduct = z.infer<typeof ProductSchema>;
