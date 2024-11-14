import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
  } from "@/components/ui/pagination"

interface CustomPaginationProps {       
  total: number;
  page: number;
  limit: number;    
}

export function CustomPagination({total, page, limit}: CustomPaginationProps) {
  const totalPages = Math.ceil(total / limit);
  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="flex flex-row justify-between items-center mb-4">
      <div>
        <h6 className="text-base font-cabinet text-muted-foreground">
          <span className="text-black">{startRecord}-{endRecord}</span> of <span className="text-black">{total}</span> total records
        </h6>
      </div>
      <div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href={page > 1 ? `?page=${page - 1}` : '#'} />
            </PaginationItem>
            {[...Array(totalPages)].map((_, index) => (
              <PaginationItem key={index}>
                <PaginationLink href={`?page=${index + 1}`} isActive={page === index + 1}>
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            {totalPages > 5 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
            <PaginationItem>
              <PaginationNext href={page < totalPages ? `?page=${page + 1}` : '#'} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}