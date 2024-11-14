import MyItems from '@/components/MyItems';
import { getMyItems } from '../../actions/items';
import { Suspense } from 'react';
import Loading from './loading';

export const metadata = {
  title: 'My Items',
  description: 'My Items',
}

export default async function MyItemsPage() {
  const {success, data} = await getMyItems({});
  return (
    <Suspense fallback={<Loading />}>
        <MyItems donations={data!} />
    </Suspense> 
  )
}
