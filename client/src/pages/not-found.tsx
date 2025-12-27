import { Link } from "wouter";
import { Button } from "@/components/UIComponents";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
           <AlertTriangle className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-display font-bold text-foreground">404</h1>
        <p className="text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <Link href="/">
          <Button className="w-full">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
