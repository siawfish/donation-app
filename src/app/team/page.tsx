import Link from "next/link";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import { InfiniteSlider } from "@/components/ui/infinite-slider";

const teamMembers = [
  {
    name: "Christian Owusu Amoako",
    role: "Founder & CEO",
    bio: "Several years of experience in Social entrepreneurship and sustainability and leading several social innovation initiatives in Ghana and Europe.",
    image: "/placeholder.svg"
  },
  {
    name: "Kenneth Anku",
    role: "Co-Founder & Product Manager",
    bio: "Extensive experience in eCommerce and business Development from building high-impact social startups in Ghana.",
    image: "/placeholder.svg"
  },
  {
    name: "Gerald Amanor",
    role: "CTO",
    bio: "Lead software engineer with over 5 years of experience in software development and management.",
    image: "/placeholder.svg"
  },
  {
    name: "Elorm Akoto",
    role: "Head of Logistics and Marketing ",
    bio: "Over 6 years of experience working in operations, marketing, delivery and logistics from companies like Jumia Group, Uber, Kobo 360",
    image: "/placeholder.svg"
  }
];

const jobListings = [
  {
    category: "Software Development",
    jobs: [
      {
        title: "Software Developer Intern",
        tag: "Software",
        description: "We're looking for a passionate software developer intern to join our team.",
        location: "Accra, Ghana",
        type: "Full-time",
        salary: "GHS 1,500 - 2,000"
      }
    ]
  },
  {
    category: "Operations",
    jobs: [
      {
        title: "Operations Manager",
        tag: "Operations",
        description: "We're looking for an experienced operations manager to oversee our daily operations.",
        location: "Accra, Ghana",
        type: "Full-time",
        salary: "GHS 5,000 - 7,000"
      }
    ]
  },
  {
    category: "IT Support",
    jobs: [
      {
        title: "IT Admin Support",
        tag: "IT",
        description: "We're looking for an IT admin support specialist to maintain our systems and assist team members.",
        location: "Accra, Ghana",
        type: "Full-time",
        salary: "GHS 3,000 - 4,500"
      }
    ]
  }
];

export default function Team() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      <Navbar />
      <main className="flex-1">
        <section className="py-12 md:py-24 container mx-auto px-4 md:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12 mb-12 lg:mb-20">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold flex-1">
              Meet the talented team<br />
              who make all this happen
            </h1>
            <p className="text-lg md:text-xl text-gray-600 flex-1">
              Our leadership team reflects our commitment to African excellence, with diverse
              executives and board members bringing deep expertise from across the continent.
            </p>
          </div>
          
          <InfiniteSlider duration={40} gap={16} className="py-8">
            {teamMembers.map((member) => (
              <div 
                key={member.name} 
                className="w-[250px] md:w-[300px] flex-shrink-0 rounded-2xl p-4 bg-secondary/20"
              >
                <div className="aspect-square relative mb-4 rounded-xl overflow-hidden">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1">{member.name}</h3>
                <p className="text-gray-600 font-medium mb-2">{member.role}</p>
                <p className="text-gray-500 text-sm">{member.bio}</p>
              </div>
            ))}
          </InfiniteSlider>
        </section>

        <section className="py-12 md:py-24 container mx-auto px-4 md:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6">We&apos;re looking for talented people</h2>
            <p className="text-lg md:text-xl text-gray-600 mb-12 md:mb-16">
              Givny is growing fast, and we are always looking for passionate, dynamic,
              and talented individuals to join our distributed team all around the world.
            </p>
          </div>

          <div className="relative grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-4 mb-12 md:mb-20">
            <div className="relative col-span-1 md:col-span-3 aspect-[3/4] rounded-2xl overflow-hidden">
              <Image
                src="/about_1.jpg"
                alt="Team member working"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="relative col-span-1 md:col-span-3 aspect-square rounded-2xl overflow-hidden">
              <Image
                src="/about_2.jpg"
                alt="Team collaboration"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative col-span-1 md:col-span-3 aspect-[3/4] rounded-2xl overflow-hidden">
              <Image
                src="/about_3.jpg"
                alt="Office environment"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative col-span-1 md:col-span-3 aspect-square rounded-2xl overflow-hidden">
              <Image
                src="/about_4.jpg"
                alt="Team meeting"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            {jobListings.map((category) => (
              <div key={category.category}>
                <h3 className="text-xl md:text-2xl font-semibold pt-6 md:pt-8 pb-3 md:pb-4">{category.category}</h3>
                <div className="space-y-3 md:space-y-4">
                  {category.jobs.map((job) => (
                    <div key={job.title} className="border rounded-xl p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className="text-lg md:text-xl font-semibold">{job.title}</h4>
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-sm">{job.tag}</span>
                          </div>
                          <p className="text-gray-600 text-sm md:text-base">{job.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">{job.location}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 md:gap-6 text-gray-600 text-sm md:text-base">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          <span>{job.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          <span>{job.salary}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
