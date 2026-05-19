
export function About() {
    return (
        <div className="max-w-3xl mx-auto px-6 py-16">

            {/* Photo & Name */}
            <div className="flex flex-col items-center gap-6 mb-16">
                <h1 className="text-4xl font-semibold tracking-tight">
                    {/* Full name */}
                    <p>Ethan Defilippi</p>
                </h1>
            </div>

            {/* About Me */}
            <section className="mb-16">
                <h2 className="text-2xl font-semibold mb-4">About Me</h2>
                <div className="bg-white text-black dark:bg-[#0D0C0C] rounded-3xl p-8 dark:text-white">
                    <p>Hello, I’m Ethan! I'm a software engineer and University of Pittsburgh graduate with a passion
                        for backend architecture and systems programming. I love diving into the details of data and
                        performance, primarily working with Python, Rust, Java, C, and PostgreSQL. I’m currently
                        refining my engineering skills through dedicated personal projects and searching for a
                        backend-focused role where I can hit the ground running.</p>
                </div>
            </section>

            {/* Skills */}
            <section>
                <h2 className="text-2xl font-semibold mb-4">Skills</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center bg-white text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                        Python
                    </div>
                    <div className="text-center bg-white text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                        Java
                    </div>
                    <div className="text-center bg-white text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                        PostgreSQL
                    </div>
                    <div className="text-center bg-white text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                        Rust
                    </div>
                    <div className="text-center bg-white text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                        TypeScript
                    </div>
                    <div className="text-center bg-white text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                        React
                    </div>
                    <div className="text-center bg-white text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                        JavaScript
                    </div>
                    <div className="text-center bg-white text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                        C
                    </div>
                    <div className="text-center bg-white text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                        ML
                    </div>
                    <div className="flex items-center justify-center text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                        Software Testing
                    </div>
                    <div className="text-center bg-white text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                        Software Testing Automation
                    </div>
                    <div className="flex items-center justify-center text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                        Docker
                    </div>
                </div>
            </section>


            {/* Socials */}
            <section className="mt-16">
                <h2 className="text-2xl font-semibold mb-4">Socials</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <a href="https://github.com/EthanD57" target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center bg-white dark:bg-[#0D0C0C] rounded-2xl px-5 py-6 hover:shadow-md transition-shadow">
                        <img src="https://skillicons.dev/icons?i=github" alt={"Github Logo"}/>
                    </a>
                    <a href="https://linkedin.com/in/ethan-defilippi" target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center bg-white dark:bg-[#0D0C0C] rounded-2xl px-5 py-6 hover:shadow-md transition-shadow">
                        <img src="https://skillicons.dev/icons?i=linkedin" alt={"LinkedIn Logo"}/>
                    </a>
                </div>
            </section>

        </div>
    );
}
