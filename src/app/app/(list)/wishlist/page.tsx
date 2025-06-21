import { Suspense } from 'react';
import Loading from './loading';
import { getWishlist } from '@/app/app/actions/items';
import Wishlist from '@/components/Wishlist';

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const {success, data, message} = await getWishlist({ page });

  return (
    <Suspense fallback={<Loading />}>
        <Wishlist wishlist={data!} />
    </Suspense> 
  )
}
