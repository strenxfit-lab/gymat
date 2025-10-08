
"use client";

import React, { useEffect, useRef } from 'react';
import { Card } from './card';

declare global {
    interface Window {
        adsbygoogle: any;
    }
}

const AdsenseDisplay = () => {
  const adRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) {
        return;
    }
    
    try {
      if (window.adsbygoogle) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          initialized.current = true;
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <Card className="mb-4">
        <div ref={adRef} className="p-4">
            <ins className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                data-ad-slot="YYYYYYYYYY"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
        </div>
    </Card>
  );
};

export default AdsenseDisplay;
