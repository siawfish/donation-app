import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Search, Heart, MessageCircle } from 'lucide-react'
import Link from "next/link";

export function QuickActions() {
    return (
        <Card className="shadow-none border-none p-0 m-0 space-y-2">
            <CardHeader className="p-0 m-0">
                <CardTitle>Quick Actions</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Common tasks made easy
                </p>
            </CardHeader>
            <CardContent className="p-0 m-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link href="/app/add-item">
                        <Button className="w-full h-20 flex flex-col items-center gap-2" variant="outline">
                            <Plus className="w-5 h-5" />
                            <span className="text-sm">Add Item</span>
                        </Button>
                    </Link>
                    <Link href="/explore">
                        <Button className="w-full h-20 flex flex-col items-center gap-2" variant="outline">
                            <Search className="w-5 h-5" />
                            <span className="text-sm">Explore</span>
                        </Button>
                    </Link>
                    <Link href="/app/wishlist">
                        <Button className="w-full h-20 flex flex-col items-center gap-2" variant="outline">
                            <Heart className="w-5 h-5" />
                            <span className="text-sm">Wishlist</span>
                        </Button>
                    </Link>
                    <Link href="/app/messages">
                        <Button className="w-full h-20 flex flex-col items-center gap-2" variant="outline">
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-sm">Messages</span>
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
} 