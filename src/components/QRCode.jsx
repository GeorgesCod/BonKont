import { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';


export function QRCode({ value, size = 200 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const qrCode = new QRCodeStyling({
      width,
      height,
      data,
      dotsOptions: {
        color(document.documentElement)
          .getPropertyValue('--primary')
          .trim(),
        type: 'rounded'
      },
      backgroundOptions: {
        color: 'transparent',
      },
      cornersSquareOptions: {
        type: 'extra-rounded'
      },
      cornersDotOptions: {
        type: 'dot'
      },
    });

    qrCode.append(ref.current);

    return () => {
      if (ref.current) {
        ref.current.innerHTML = '';
      }
    };
  }, [value, size]);

  return <div ref={ref} className="qr-code" />;
}