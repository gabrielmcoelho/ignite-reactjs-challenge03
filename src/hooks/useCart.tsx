import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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

  const addProduct = async (productId: number): Promise<void> => {
    try {
      const updatedCart = [...cart];
      const foundProduct = updatedCart.find(product => product.id === productId);

      const amount = foundProduct ? foundProduct.amount : 0;
      const stockAmount = (await api.get(`/stock/${productId}`)).data.amount;

      if (amount+1 > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (foundProduct) {
        foundProduct.amount += 1;
      } else {
        const newProduct = (await api.get(`/products/${productId}`)).data
        newProduct.amount = 1;
        updatedCart.push(newProduct)
      }

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
        toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number): void => {
    try {
      if(!cart.find(product => product.id === productId)) throw new Error();

      const updatedCart = cart.filter(product => product.id !== productId);
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
        toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount): Promise<void> => {
    try {
      if(amount <= 0) return;

      const updatedCart = [...cart];

      const foundProduct = updatedCart.find(product => product.id === productId);
      if (!foundProduct) throw new Error();
      
      const stockAmount = (await api.get(`/stock/${productId}`)).data.amount;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      foundProduct.amount = amount
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
        toast.error('Erro na alteração de quantidade do produto');
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
