
export default function LandingPageHero({ handleGetStarted }: { handleGetStarted: () => void }) {
    return (

        <div className="hero bg-base-200 min-h-screen">
            <div className="hero-content flex-col lg:flex-row-reverse">
                <img
                    src="/tma-icon.jpeg"
                    className="max-w-sm rounded-lg shadow-2xl"
                    alt="Hero image"
                />
                <div>
                    <h1 className="text-5xl font-bold">Welcome to The Menu App!</h1>
                    <p className="py-6">
                        Discover and explore menus from various restaurants. Get
                        AI-powered recommendations and manage your favorite dishes.
                    </p>
                    <button className="btn btn-primary" onClick={handleGetStarted}>
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    );
}