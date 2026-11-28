import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_PREFIX } from '@/constants'
import { seedProducts } from '@/data/products'
import {
  createProduct,
  isApiConfigured,
  updateProduct as updateProductApi,
  uploadProductImage,
} from '@/lib/api'
import { generateId } from '@/lib/utils'
import type { Product, ProductFormInput } from '@/types'

/** `photoError` is set when the product saved but its photo could not be uploaded. */
type ActionResult =
  | { ok: true; product: Product; photoError?: string }
  | { ok: false; message: string }
type UpdateResult =
  | { ok: true; photoError?: string }
  | { ok: false; message: string }

interface ProductState {
  products: Product[]
  addProduct: (
    vendorId: string,
    input: ProductFormInput,
    imageFile?: File | null,
  ) => Promise<ActionResult>
  updateProduct: (
    productId: string,
    input: Partial<Omit<ProductFormInput, 'commodityId'>> & {
      commodityId?: string
    },
    imageFile?: File | null,
  ) => Promise<UpdateResult>
  toggleAvailability: (
    productId: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>
  archiveProduct: (
    productId: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>
  adjustStock: (productId: string, delta: number) => void
  resetProducts: () => void
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: isApiConfigured() ? [] : seedProducts,
      addProduct: async (vendorId, input, imageFile) => {
        if (isApiConfigured()) {
          try {
            let product = await createProduct(vendorId, input)
            set({ products: [...get().products, product] })
            let photoError: string | undefined
            if (imageFile) {
              try {
                const imageUrl = await uploadProductImage(product.id, imageFile)
                product = { ...product, imageUrl }
                set({
                  products: get().products.map((p) =>
                    p.id === product.id ? product : p,
                  ),
                })
              } catch (error) {
                photoError =
                  error instanceof Error
                    ? error.message
                    : 'The photo could not be uploaded.'
              }
            }
            return { ok: true, product, photoError }
          } catch (error) {
            return {
              ok: false,
              message:
                error instanceof Error ? error.message : 'Unable to add product.',
            }
          }
        }
        const product: Product = {
          id: generateId('PROD'),
          vendorId,
          ...input,
          isArchived: false,
        }
        set({ products: [...get().products, product] })
        return { ok: true, product }
      },
      updateProduct: async (productId, input, imageFile) => {
        if (isApiConfigured()) {
          try {
            let product = await updateProductApi(productId, input)
            let photoError: string | undefined
            if (imageFile) {
              try {
                const imageUrl = await uploadProductImage(productId, imageFile)
                product = { ...product, imageUrl }
              } catch (error) {
                photoError =
                  error instanceof Error
                    ? error.message
                    : 'The photo could not be uploaded.'
              }
            }
            set({
              products: get().products.map((p) =>
                p.id === productId ? product : p,
              ),
            })
            return { ok: true, photoError }
          } catch (error) {
            return {
              ok: false,
              message:
                error instanceof Error
                  ? error.message
                  : 'Unable to update product.',
            }
          }
        }
        set({
          products: get().products.map((product) =>
            product.id === productId ? { ...product, ...input } : product,
          ),
        })
        return { ok: true }
      },
      toggleAvailability: async (productId) => {
        const current = get().products.find((p) => p.id === productId)
        if (!current) return { ok: false, message: 'Product not found.' }
        return get().updateProduct(productId, {
          isAvailable: !current.isAvailable,
        })
      },
      archiveProduct: async (productId) => {
        if (isApiConfigured()) {
          try {
            const product = await updateProductApi(productId, {
              isArchived: true,
              isAvailable: false,
            })
            set({
              products: get().products.map((p) =>
                p.id === productId ? product : p,
              ),
            })
            return { ok: true }
          } catch (error) {
            return {
              ok: false,
              message:
                error instanceof Error
                  ? error.message
                  : 'Unable to archive product.',
            }
          }
        }
        set({
          products: get().products.map((product) =>
            product.id === productId
              ? { ...product, isArchived: true, isAvailable: false }
              : product,
          ),
        })
        return { ok: true }
      },
      adjustStock: (productId, delta) => {
        set({
          products: get().products.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  stock: Math.max(0, product.stock + delta),
                }
              : product,
          ),
        })
      },
      resetProducts: () =>
        set({
          products: isApiConfigured() ? [] : structuredClone(seedProducts),
        }),
    }),
    {
      name: `${STORAGE_PREFIX}-products`,
    },
  ),
)
