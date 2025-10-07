
"use client";

import React, { useEffect } from 'react';
import { Card } from './card';

declare global {
    interface Window {
        adsbygoogle: any;
    }
}

const AdsenseDisplay = () => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <Card className="mb-4">
        <div className="p-4">
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
