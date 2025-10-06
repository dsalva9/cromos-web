'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function UIDemoPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">shadcn/ui Component Demo</h1>

        {/* Button Variants */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Button Components</h2>
          <div className="flex flex-wrap gap-4">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default Size</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        {/* Badge Variants */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Badge Components</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge className="bg-green-500">Custom Green</Badge>
            <Badge className="bg-blue-500">Custom Blue</Badge>
            <Badge className="bg-purple-500">Custom Purple</Badge>
          </div>
        </section>

        {/* Card Components */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Card Components</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>
                  This is a description for the card component.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Card content goes here. This is where you would put the main content of your card.
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button>Save</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Player Card
                  <Badge className="bg-yellow-500">⭐ 92</Badge>
                </CardTitle>
                <CardDescription>
                  Football player card example
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Team:</strong> FC Barcelona</p>
                  <p><strong>Position:</strong> Forward</p>
                  <p><strong>Nationality:</strong> Poland</p>
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex gap-2 w-full">
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                    Tengo
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Quitar uno
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Component Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Button</span>
                  <Badge className="bg-green-500">✓ Working</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Badge</span>
                  <Badge className="bg-green-500">✓ Working</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Card</span>
                  <Badge className="bg-green-500">✓ Working</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Interactive Examples */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Interactive Examples</h2>
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => alert('Button clicked!')}>
                  Click Me
                </Button>
                <Button variant="outline" onClick={() => alert('Outline clicked!')}>
                  Outline Button
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                These buttons will show an alert when clicked to confirm interactivity works.
              </p>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
