import React from "react";

export default function HowItWorks() {
  return (
    <section className="w-full py-12 md:py-16 bg-white md:min-h-screen flex items-center">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="max-w-xl mb-10 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4">Choose how to<br className="hidden sm:block" />give back</h2>
          <p className="text-base md:text-lg text-gray-600">
            Our donation process is simple and straightforward. Follow these steps to give or receive items.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
          {/* Card 1 */}
          <div className="bg-white border border-gray-100 rounded-lg p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 rounded-lg flex items-center justify-center mb-4 md:mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="font-bold text-lg md:text-xl mb-2 md:mb-3 text-gray-900">Register</h3>
            <p className="text-sm md:text-base text-gray-600">
              Sign up in just a few steps to join the Givny community. Create a profile so you can start sharing or requesting items.
            </p>
          </div>
          
          {/* Card 2 */}
          <div className="bg-white border border-gray-100 rounded-lg p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-purple-50 rounded-lg flex items-center justify-center mb-4 md:mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h3 className="font-bold text-lg md:text-xl mb-2 md:mb-3 text-gray-900">List</h3>
            <p className="text-sm md:text-base text-gray-600">
              Have something you no longer need? Take a photo, add a short description, and list it on the platform for others to see.
            </p>
          </div>
          
          {/* Card 3 */}
          <div className="bg-white border border-gray-100 rounded-lg p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-green-50 rounded-lg flex items-center justify-center mb-4 md:mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3 className="font-bold text-lg md:text-xl mb-2 md:mb-3 text-gray-900">Explore</h3>
            <p className="text-sm md:text-base text-gray-600">
              Browse through available items near you. Use categories and filters to find exactly what you&apos;re looking for, quickly and easily.
            </p>
          </div>
          
          {/* Card 4 */}
          <div className="bg-white border border-gray-100 rounded-lg p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-red-50 rounded-lg flex items-center justify-center mb-4 md:mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <h3 className="font-bold text-lg md:text-xl mb-2 md:mb-3 text-gray-900">Request</h3>
            <p className="text-sm md:text-base text-gray-600">
              Found something you need? Send a request to the donor with a brief message.
            </p>
          </div>
          
          {/* Card 5 */}
          <div className="bg-white border border-gray-100 rounded-lg p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-yellow-50 rounded-lg flex items-center justify-center mb-4 md:mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a16207" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 className="font-bold text-lg md:text-xl mb-2 md:mb-3 text-gray-900">Receive</h3>
            <p className="text-sm md:text-base text-gray-600">
              Once your request is approved, coordinate with the donor to pick up your item. It&apos;s that simple!
            </p>
          </div>
          
          {/* Optional additional card */}
          <div className="bg-white border border-gray-100 rounded-lg p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 rounded-lg flex items-center justify-center mb-4 md:mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="font-bold text-lg md:text-xl mb-2 md:mb-3 text-gray-900">Stay Safe</h3>
            <p className="text-sm md:text-base text-gray-600">
              We provide safety guidelines and tips to ensure a secure and positive exchange experience for everyone.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
} 