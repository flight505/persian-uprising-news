"use client"

export default function HeroSection() {
  return (
    <div className="relative min-h-[16vh] md:min-h-[20vh] lg:min-h-[24vh] overflow-hidden pb-4">
      {/* Hero Content */}
      <div className="relative z-10 px-6 pt-5 md:pt-6 pb-3">
        <div className="max-w-4xl mx-auto">
          <div className="mb-2">
            <h1 className="font-serif m3-headline-large md:m3-display-small lg:m3-display-medium drop-shadow-lg">
              <span className="text-brand-warm">
                PERSIAN
                <br />
                UPRISING
              </span>
              <br />
              <span className="inline-flex items-center gap-2 md:gap-3 text-brand-sage">
                NEWS
                <img
                  src="/images/dove-and-fist.png"
                  alt="Dove of peace and fist of freedom"
                  className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 object-contain drop-shadow-lg"
                />
              </span>
            </h1>
          </div>

          <p className="m3-body-small md:m3-body-medium text-brand-warm/80 max-w-xl md:max-w-2xl drop-shadow-md">
            Real-time updates, verified stories, and global solidarity for freedom and human rights
          </p>
          {/* </CHANGE> */}
        </div>
      </div>
    </div>
  )
}
