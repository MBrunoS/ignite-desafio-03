import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find((product) => product.id === productId);

      const isStockAvailable = await checkStockAvailability(
        productId,
        productInCart?.amount
      );

      if (productInCart && !isStockAvailable) {
        toast.error("Quantidade solicitada fora de estoque");
      } else if (productInCart) {
        const updatedCart = cart.map((product) => {
          if (product.id === productId) {
            product.amount += 1;
          }
          return product;
        });

        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        const productResponse = await api.get(`products/${productId}`);
        const product: Product = productResponse.data;

        const updatedCart = [...cart, { ...product, amount: 1 }];
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const checkStockAvailability = async (
    productId: number,
    productAmount: number | undefined
  ) => {
    const stockResponse = await api.get(`stock/${productId}`);
    const amountInStock: number = stockResponse.data?.amount;

    return (productAmount ?? 0) < amountInStock;
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = cart.filter((product) => product.id !== productId);

      if (updatedCart.length === cart.length) {
        throw "Erro na remoção do produto";
      }

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch (msg) {
      toast.error(msg as string);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const isStockAvailable = await checkStockAvailability(productId, amount);

      if (!isStockAvailable) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = cart.map((product) => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      });

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
