import MyDonations from '@/components/MyDonations';
import { getMyDonations } from '../../../actions/items';
import { Suspense } from 'react';
import Loading from './loading';

export const metadata = {
  title: 'My Donations',
  description: 'Items given away',
}

export default async function MyDonationsPage() {
  const {success, data, message} = await getMyDonations({});
  return (
    <Suspense fallback={<Loading />}>
        <MyDonations donations={data!} />
    </Suspense>
  )
}
