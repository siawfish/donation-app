import MyItems from '@/components/MyItems';
import { getMyItems } from '../../../actions/items';
import { Suspense } from 'react';
import Loading from './loading';

export default async function MyItemsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const {success, data} = await getMyItems({ page });
  return (
    <Suspense fallback={<Loading />}>
        <MyItems donations={data!} />
    </Suspense> 
  )
}
