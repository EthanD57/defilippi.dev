//Represents all the languages that I know/have experience in.
const logos = [
    "https://skillicons.dev/icons?i=js",
    "https://skillicons.dev/icons?i=react",
    "https://skillicons.dev/icons?i=tailwind",
    "https://skillicons.dev/icons?i=ts",
    "https://skillicons.dev/icons?i=html",
    "https://skillicons.dev/icons?i=css",
    "https://skillicons.dev/icons?i=c",
    "https://skillicons.dev/icons?i=git",
    "https://skillicons.dev/icons?i=py",
    "https://skillicons.dev/icons?i=postgres",
    "https://skillicons.dev/icons?i=java",
];

const items = Array.from({ length: 20 }).map((_, i) => {
    const duration = Math.random() * 30 + 30; // 30s–60s each
    return {
        src: logos[i % logos.length],
        top: `${Math.random() * 100}%`,
        left: `-${Math.random() * 5 + 3}%`,
        width: `${Math.random() * 30 + 30}px`,
        animationDuration: `${duration+20}s`,  //This controls the minimum duration
        animationDelay: `-${Math.random() * duration}s`, // random point in their own cycle
    };
});

const BackgroundLogos = () => {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
            {items.map((item, i) => (
                <img
                    key={i}
                    src={item.src}
                    className="absolute animate-float"
                    style={{
                        top: item.top,
                        left: item.left,
                        width: item.width,
                        animationDuration: item.animationDuration,
                        animationDelay: item.animationDelay,
                        filter: 'grayscale(20%)',
                    }}
                    alt="tech logo"
                />
            ))}
        </div>
    );
};

export default BackgroundLogos;