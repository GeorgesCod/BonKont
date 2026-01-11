 import { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

export function QRCode({ value, size = 200 }) {
  const ref = useRef(null);
  const qrCode = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    // Initialisation une seule fois
    qrCode.current = new QRCodeStyling({
      width: size,
      height: size,
      data: value,
      dotsOptions: {
        color: '#000000', // Tu peux ici utiliser une variable CSS si besoin
        type: 'rounded',
      },
      backgroundOptions: {
        color: 'transparent',
      },
      cornersSquareOptions: {
        type: 'extra-rounded',
      },
      cornersDotOptions: {
        type: 'dot',
      },
    });

    qrCode.current.append(ref.current);

    return () => {
      if (ref.current) {
        ref.current.innerHTML = '';
      }
    };
  }, []); // Initialise une seule fois

  useEffect(() => {
    if (qrCode.current) {
      qrCode.current.update({
        data: value,
        width: size,
        height: size,
      });
    }
  }, [value, size]);

  return <div ref={ref} className="qr-code" />;
}
