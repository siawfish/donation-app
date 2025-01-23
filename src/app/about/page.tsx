import Link from "next/link";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import DonationSteps from "@/components/ui/donation-steps";

export default function About() {
    return (
        <div className="flex flex-col min-h-[100dvh] bg-white">
            <Navbar />
                <main className="flex-1">
                    <section className="py-12 md:py-24 container mx-auto max-w-8xl px-4 md:px-6 space-y-48">
                        <div className="w-full flex justify-center items-center">
                            <div className="flex flex-col items-center gap-12 w-full">
                                <h1 className="text-3xl md:text-4xl lg:text-5xl text-center font-bold flex-1">
                                    Give What You Don't Need, <br />Get What You Do
                                </h1>
                                <div className="w-full h-[500px] bg-gray-200 bg-[url('/ab_1.jpg')] bg-cover bg-center bg-no-repeat rounded-3xl" />
                            </div>
                        </div>
                        <section className="flex justify-center w-full px-4 md:px-6">
                            <div className="container mx-auto max-w-8xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                                    <div className="flex flex-col gap-4">
                                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                                        What is Givny? 
                                        </h2>
                                        <p className="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                                        Givny is a digital platform where individuals can list items they no longer need, and others can request and receive them for free. We believe in giving items a second life by connecting those who no longer need them with those who do. We focus on accessibility and ease of use, championing sustainability, minimising waste, and addressing poverty and inequality.
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <Image 
                                            src="/give-1.jpg" 
                                            alt="Why we do this" 
                                            className="rounded-lg" 
                                            width={650} 
                                            height={366} 
                                            style={{
                                                width: "100%",
                                                height: "auto",
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                        <section className="flex justify-center w-full px-4 md:px-6">
                            <div className="container mx-auto max-w-8xl space-y-12 max-w-5xl">
                                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center">
                                    Who Can Use Our Platform? 
                                </h1>
                                <p className="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed text-center">
                                    Givny is open to all individuals and organizations. Whether you want to donate items or are in need of items, the platform is here for you. Users must be at least 18 years old or have parental guidance to create an account and engage with the platform.
                                </p>
                            </div>
                        </section>
                        
                        <DonationSteps 
                            showImage={false} 
                            contentClassName="max-w-5xl mx-auto text-center justify-center" 
                            contentHeaderClassName="text-center self-center" 
                            titleClassName="text-center self-center" 
                            descriptionClassName="text-center self-center"
                            containerClassName="py-0 md:py-0 lg:py-0"
                        />

                        <section className="flex justify-center w-full px-4 md:px-6">
                            <div className="container mx-auto max-w-8xl space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">Things You Can List</h2>
                                        <div className="grid grid-cols-1 gap-4">
                                            {[
                                                "Clothing and footwear",
                                                "Electronics (in working condition)",
                                                "Furniture",
                                                "Books and educational materials",
                                                "Kitchenware and household items",
                                                "Toys and games",
                                                "Non-perishable food items"
                                            ].map((item, index) => (
                                                <div key={index} className="flex items-center gap-2 p-4 rounded-lg border bg-white">
                                                    <svg
                                                        className="h-5 w-5 text-green-500"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                    <span>{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">Things You Cannot List</h2>
                                        <div className="grid grid-cols-1 gap-4">
                                            {[
                                                "Hazardous materials (e.g., chemicals, explosives)",
                                                "Expired or perishable food items",
                                                "Broken or non-functional electronics",
                                                "Illegal items (e.g., weapons or firearms, explosives, drugs)",
                                                "Items that do not comply with hygiene standards or may pose health or safety risks"
                                            ].map((item, index) => (
                                                <div key={index} className="flex items-center gap-2 p-4 rounded-lg border bg-white">
                                                    <svg
                                                        className="h-5 w-5 text-red-500"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M6 18L18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                    <span>{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </section>
                </main>
            <Footer />
        </div>
    );
}
