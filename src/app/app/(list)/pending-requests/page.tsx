import { Suspense } from 'react';
import Loading from './loading';
import { getMyRequests } from '@/app/app/actions/items';
import MyRequests from '@/components/MyRequests';

export default async function MyDonationsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const {success, data, message} = await getMyRequests({ page });

  return (
    <Suspense fallback={<Loading />}>
        <MyRequests requests={data!} />
    </Suspense>
  )
}
