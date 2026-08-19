import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";

export default function About() {
    return (
        <div className="flex flex-col min-h-[100dvh] bg-canvas">
            <Navbar />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="w-full flex justify-center items-center py-16 md:py-24">
                    <div className="container px-4 md:px-6 max-w-4xl">
                        <div className="text-center space-y-6">
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-ink">
                                Give Things a<br />Second Life
                            </h1>
                            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto">
                                Givny keeps good things in use by moving them between neighbours. 
                                A simple platform for sharing items and building community.
                            </p>
                        </div>
                    </div>
                </section>

                {/* What is Givny Section */}
                <section className="w-full py-12 md:py-16 bg-sand">
                    <div className="container px-4 md:px-6 max-w-4xl mx-auto">
                        <div className="text-center space-y-6">
                            <h2 className="text-2xl md:text-3xl font-bold text-ink">
                                What is Givny?
                            </h2>
                            <p className="text-base md:text-lg text-gray-500 max-w-3xl mx-auto">
                                Givny is a free community marketplace where people list things they no longer use, 
                                and neighbours nearby can ask for them. Nothing costs anything, ever. 
                                Every item passed on is one less thing made, and one less thing thrown away.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Guidelines Section */}
                <section className="w-full py-12 md:py-16">
                    <div className="container px-4 md:px-6 max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* What You Can List */}
                            <div className="space-y-6">
                                <h3 className="text-xl md:text-2xl font-bold text-ink">What You Can Share</h3>
                                <div className="space-y-3">
                                    {[
                                        "Clothing and footwear",
                                        "Electronics (working condition)",
                                        "Furniture and home items",
                                        "Books and educational materials",
                                        "Toys and games"
                                    ].map((item, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-gray-700">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* What You Cannot List */}
                            <div className="space-y-6">
                                <h3 className="text-xl md:text-2xl font-bold text-ink">What We Don&apos;t Allow</h3>
                                <div className="space-y-3">
                                    {[
                                        "Hazardous materials",
                                        "Expired or perishable foods",
                                        "Broken electronics",
                                        "Illegal items",
                                        "Items posing health risks"
                                    ].map((item, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <span className="text-gray-700">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Who Can Use Section */}
                <section className="w-full py-12 md:py-16 bg-sand">
                    <div className="container px-4 md:px-6 max-w-4xl mx-auto">
                        <div className="text-center space-y-6">
                            <h2 className="text-2xl md:text-3xl font-bold text-ink">
                                Who Can Use Givny?
                            </h2>
                            <p className="text-base md:text-lg text-gray-500 max-w-3xl mx-auto">
                                Our platform is open to all individuals and organizations. 
                                Users must be at least 18 years old or have parental guidance to participate.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
