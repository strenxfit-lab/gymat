
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import Link from 'next/link';

interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  targetRoles: string[];
  displayLocations: string[];
}

interface BannerDisplayProps {
  location: 'dashboard' | 'community';
}

export function BannerDisplay({ location }: BannerDisplayProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      const userRole = localStorage.getItem('userRole');
      if (!userRole) {
        setLoading(false);
        return;
      }

      try {
        const bannersRef = collection(db, 'banners');
        const q = query(
          bannersRef,
          where('status', '==', 'active'),
          where('targetRoles', 'array-contains', userRole),
          where('displayLocations', 'array-contains', location),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const bannersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
        setBanners(bannersList);
      } catch (error) {
        console.error("Error fetching banners:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, [location]);

  if (loading || banners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 my-6">
      {banners.map(banner => (
        <Link key={banner.id} href={banner.linkUrl} passHref target="_blank" rel="noopener noreferrer">
            <div className="relative w-full aspect-[2/1] md:aspect-[3/1] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                <Image
                    src={banner.imageUrl}
                    alt="Promotional Banner"
                    layout="fill"
                    objectFit="cover"
                />
            </div>
        </Link>
      ))}
    </div>
  );
}
