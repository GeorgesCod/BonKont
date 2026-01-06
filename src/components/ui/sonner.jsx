import { useTheme } from 'next-themes';
import { Toaster } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme['theme']}
      className="toaster group"
      toastOptions={{
        classNames,
      }}
      {...props}
    />
  );
};

export { Toaster };
