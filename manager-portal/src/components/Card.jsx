export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-dark-800 rounded-xl p-6 border border-dark-700 ${className}`}>
      {children}
    </div>
  );
}
