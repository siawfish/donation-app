import Donor from '@/components/Donor'
import { getMyItems } from './actions/items';
import Error from 'next/error';
export const metadata = {
  title: 'Donor Dashboard',
  description: 'Donor dashboard',
}

export default async function Account() {
  const {success, data} = await getMyItems({});
  return (
    <Donor donations={data!} />
  )
}
