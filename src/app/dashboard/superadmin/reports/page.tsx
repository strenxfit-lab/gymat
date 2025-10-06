
"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, deleteDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

interface Report {
    id: string;
    postId: string;
    reporterUsername: string;
    reportedAt: string;
    postAuthorId: string;
}

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchReports = async () => {
        setLoading(true);
        try {
            const reportsRef = collection(db, 'reports');
            const q = query(reportsRef, orderBy('reportedAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const reportsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                reportedAt: doc.data().reportedAt.toDate().toLocaleString(),
            } as Report));
            setReports(reportsList);
        } catch (error) {
            console.error("Error fetching reports:", error);
            toast({ title: 'Error', description: 'Could not fetch reports.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [toast]);

    const handleDeletePost = async (report: Report) => {
        try {
            // Delete the post
            await deleteDoc(doc(db, 'gymRats', report.postId));

            // Send notification to the author
            const authorCommunityQuery = query(collection(db, 'userCommunity'), where('userId', '==', report.postAuthorId));
            const authorCommunitySnap = await getDocs(authorCommunityQuery);

            if (!authorCommunitySnap.empty) {
                const authorCommunityDoc = authorCommunitySnap.docs[0];
                const notificationsRef = collection(authorCommunityDoc.ref, 'notifications');
                await addDoc(notificationsRef, {
                    type: 'post_deleted',
                    message: 'Your post was removed by an admin for violating community guidelines.',
                    createdAt: serverTimestamp(),
                });
            }

            // Delete the report
            await deleteDoc(doc(db, 'reports', report.id));

            toast({ title: 'Post Deleted', description: 'The reported post has been removed and the user notified.' });
            await fetchReports(); // Refresh the list
        } catch (error) {
            console.error('Error deleting post:', error);
            toast({ title: 'Error', description: 'Could not delete the post.', variant: 'destructive' });
        }
    };

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-10">
            <Card>
                <CardHeader>
                    <CardTitle>Reported Posts</CardTitle>
                    <CardDescription>Review and take action on posts reported by users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Post ID</TableHead>
                                <TableHead>Reported By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.length > 0 ? reports.map(report => (
                                <TableRow key={report.id}>
                                    <TableCell className="font-mono">{report.postId}</TableCell>
                                    <TableCell>{report.reporterUsername}</TableCell>
                                    <TableCell>{report.reportedAt}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Link href={`/posts/${report.postId}`} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4"/>View Post</Button>
                                        </Link>
                                        <Button variant="destructive" size="sm" onClick={() => handleDeletePost(report)}>
                                            <Trash2 className="mr-2 h-4 w-4"/>Delete Post
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">No pending reports.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
