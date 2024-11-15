import { Suspense } from 'react';
import Loading from './loading';
import { getReceivedDonations } from '@/app/app/actions/items';
import ReceivedDonations from '@/components/ReceivedDonations';

export const metadata = {
  title: 'My Items',
  description: 'My Items',
}

export default async function MyItemsPage() {
  const {success, data, message} = await getReceivedDonations({});
  return (
    <Suspense fallback={<Loading />}>
        <ReceivedDonations donations={data!} />
    </Suspense> 
  )
}
