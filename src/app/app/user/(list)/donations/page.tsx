import { Suspense } from 'react';
import Loading from './loading';
import { getReceivedDonations } from '@/app/app/actions/items';
import ReceivedDonations from '@/components/ReceivedDonations';

export default async function MyItemsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const {success, data, message} = await getReceivedDonations({ page });
  return (
    <Suspense fallback={<Loading />}>
        <ReceivedDonations donations={data!} />
    </Suspense> 
  )
}
