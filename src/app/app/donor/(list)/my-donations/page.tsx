import MyDonations from '@/components/MyDonations';
import { getMyDonations } from '../../../actions/items';
import { Suspense } from 'react';
import Loading from './loading';

export default async function MyDonationsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const {success, data, message} = await getMyDonations({ page });
  
  return (
    <Suspense fallback={<Loading />}>
        <MyDonations donations={data!} />
    </Suspense>
  )
}
