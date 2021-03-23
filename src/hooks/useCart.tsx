import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = window.localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let newCart: Product[] = []

      const productIndex = cart.findIndex(product => product.id === productId)

      if (productIndex === -1) {
        const { data: product } = await api.get(`/products/${productId}`)

        if (!product) throw new Error('This product not found.')


        newCart = [
          ...cart,
          { ...product, amount: 1 }
        ]
      } else {
        const { data: stock } = await api.get(`/stock/${productId}`)

        const productInCart = cart[productIndex]

        if (productInCart.amount + 1 > stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return
        }

        newCart = [...cart];

        newCart.splice(productIndex, 1, {
          ...productInCart,
          amount: 1 + productInCart.amount,
        });
      }

      window.localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

      setCart(newCart)
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId)

      if (newCart.length === cart.length) {
        throw new Error('This product not exist on the cart')
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      setCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        toast.error('Quantidade inválida')
        return
      }

      const { data: stock } = await api.get(`/stock/${productId}`)

      const productIndex = cart.findIndex(product => product.id === productId)

      const product = cart[productIndex]

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const newCart = [...cart];

      newCart.splice(productIndex, 1, {
        ...product,
        amount,
      });

      window.localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

      setCart(newCart)
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
