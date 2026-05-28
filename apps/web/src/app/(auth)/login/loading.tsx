import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginLoading() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center space-y-2">
        <Skeleton className="h-8 w-40 mx-auto" />
        <Skeleton className="h-4 w-56 mx-auto" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-3 w-48 mx-auto" />
        <p className="sr-only">Loading sign-in…</p>
      </CardContent>
    </Card>
  );
}
