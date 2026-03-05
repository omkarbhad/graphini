interface Props {
  title: string;
  icon?: React.ReactNode;
}

const SectionBadge = ({ title, icon }: Props) => {
  return (
    <div className="relative inline-flex h-8 overflow-hidden rounded-full p-[1.5px] focus:outline-none select-none">
      <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#4f46e5_0%,#a5b4fc_50%,#4f46e5_100%)]" />
      <span className="inline-flex h-full w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-slate-950 px-4 py-1 text-sm font-medium text-white backdrop-blur-3xl">
        {icon}
        {title}
      </span>
    </div>
  );
};

export default SectionBadge;
