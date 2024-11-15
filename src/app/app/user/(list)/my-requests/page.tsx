import { Suspense } from 'react';
import Loading from './loading';
import { getMyRequests } from '@/app/app/actions/items';
import MyRequests from '@/components/MyRequests';

export const metadata = {
  title: 'My Donations',
  description: 'My Donations',
}

export default async function MyDonationsPage() {
  const {success, data, message} = await getMyRequests({});

  return (
    <Suspense fallback={<Loading />}>
        <MyRequests requests={data!} />
    </Suspense>
  )
}
