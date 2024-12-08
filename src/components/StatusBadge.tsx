import { Badge } from "./ui/badge"
import { RequestStatus } from "@/app/types"

export default function StatusBadge({ requestStatus }: { requestStatus: RequestStatus }) {
  const statusText = requestStatus === RequestStatus.ACCEPTED ? 'Accepted' : requestStatus === RequestStatus.CANCELLED ? 'Cancelled' : 'Completed'
  return (
    <Badge 
      className={`${requestStatus === RequestStatus.ACCEPTED ? 'bg-yellow-100 text-yellow-700 border-yellow-700' : requestStatus === RequestStatus.CANCELLED ? 'bg-red-100 text-red-700 border-red-700' : 'bg-green-100 text-green-700 border-green-700'}`} 
      variant="outline"
    >
      {statusText}
    </Badge>
  )
}