import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
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

  // useEffect(() => {
  //   localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  // }, [cart])

  const addProduct = async (productId: number): Promise<void> => {
    try {
      const foundProductIndex = cart.findIndex(product => product.id === productId);
      if(foundProductIndex > -1) {
        await api.get(`/stock/${productId}`).then(response => {
          if(cart[foundProductIndex].amount < response.data.amount) {
            const updatedCart = [...cart];
            updatedCart[foundProductIndex].amount += 1;
            setCart(updatedCart);
            localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
          } else {
            toast.error("Quantidade solicitada fora de estoque");
          }
        })
      } else {
        await api.get(`/products/${productId}`).then(response => {
          const updatedCart = [...cart];
          const newProduct = {
            ...response.data,
            amount: 1
          };
          updatedCart.push(newProduct);
          setCart(updatedCart);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
        })
      }
    } catch {
        toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number): void => {
    try {
      if(!cart.find(product => product.id === productId)) {
        throw new Error();
      } else {
        const updatedCart = cart.filter(product => product.id !== productId);
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      }
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
      const foundProductIndex = cart.findIndex(product => product.id === productId);
      await api.get(`/stock/${productId}`).then(response => {
        if(amount <= response.data.amount) {
          const updatedCart = [...cart];
          updatedCart[foundProductIndex].amount = amount;
          setCart(updatedCart);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      })
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
