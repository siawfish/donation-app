import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
  } from "@/components/ui/pagination"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

interface CustomPaginationProps {       
  total: number;
  page: number;
  limit: number;  
  containerClassName?: string;
}

export function CustomPagination({total, page, limit, containerClassName}: CustomPaginationProps) {
  const totalPages = Math.ceil(total / limit);
  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className={`flex flex-row justify-center md:justify-between items-center mb-4 ${containerClassName}`}>
      <div className="hidden md:block">
        <h6 className="text-base font-cabinet text-muted-foreground">
          <span className="text-black">{startRecord}-{endRecord}</span> of <span className="text-black">{total}</span> total records
        </h6>
      </div>
      <div>
        <Pagination>
          <PaginationContent>
            <PaginationItem className="md:hidden w-[30px] h-[30px] flex items-center justify-center mr-2">
              <Link href={page > 1 ? `?page=${page - 1}` : '#'}>
                <ChevronLeftIcon className="w-4 h-4" />
              </Link>
            </PaginationItem>
            <PaginationItem className="hidden md:block">
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
            <PaginationItem className="hidden md:block">
              <PaginationNext href={page < totalPages ? `?page=${page + 1}` : '#'} />
            </PaginationItem>
            <PaginationItem className="md:hidden w-[30px] h-[30px] flex items-center justify-center ml-2">
              <Link href={page < totalPages ? `?page=${page + 1}` : '#'}>
                <ChevronRightIcon className="w-4 h-4" />
              </Link>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}