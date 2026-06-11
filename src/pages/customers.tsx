import { useListCustomers, useCreateCustomer, useUpdateCustomer, useGetCustomer, getListCustomersQueryKey, getGetCustomerQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Users, Search, MoreHorizontal, Pencil, Trophy, Eye, Clock, ShoppingBag } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@workspace/api-client-react";
import { useT } from "@/lib/i18n-context";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const { data: customers = [], isLoading } = useListCustomers({ q: search || undefined });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const t = useT();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.customers.title}</h1>
          <p className="text-muted-foreground mt-1">{t.customers.subtitle}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate">
              <Plus className="w-4 h-4 mr-2" /> {t.customers.addCustomer}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.customers.addCustomer}</DialogTitle>
              <DialogDescription>{t.customers.subtitle}</DialogDescription>
            </DialogHeader>
            <CustomerForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2 bg-muted/20">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={t.customers.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm h-9 border-none bg-transparent shadow-none focus-visible:ring-0 px-0"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.customers.name}</TableHead>
                <TableHead>{t.customers.phone}</TableHead>
                <TableHead className="text-right">{t.customers.loyaltyPoints}</TableHead>
                <TableHead className="text-right">{t.customers.totalSpent}</TableHead>
                <TableHead className="text-right">{t.customers.orderCount}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">{t.common.loading}</TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {t.customers.noCustomers}
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium cursor-pointer hover:underline" onClick={() => setViewingCustomerId(customer.id)}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        {customer.name}
                      </div>
                    </TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                        <Trophy className="w-3 h-3 mr-1" />
                        {customer.loyaltyPoints}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(customer.totalSpent)}</TableCell>
                    <TableCell className="text-right">{customer.orderCount}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingCustomerId(customer.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t.common.viewDetails}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t.common.edit}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.customers.editCustomer}</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <CustomerForm customer={editingCustomer} onSuccess={() => setEditingCustomer(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingCustomerId} onOpenChange={(open) => !open && setViewingCustomerId(null)}>
        <DialogContent className="max-w-3xl">
          {viewingCustomerId && <CustomerDetailView id={viewingCustomerId} onClose={() => setViewingCustomerId(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerDetailView({ id, onClose }: { id: string, onClose: () => void }) {
  const { data: customer, isLoading } = useGetCustomer(id, { query: { enabled: !!id, queryKey: getGetCustomerQueryKey(id) } });
  const t = useT();

  if (isLoading || !customer) return <div className="py-12 text-center text-muted-foreground">{t.common.loading}</div>;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-2xl">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div>{customer.name}</div>
            <div className="text-sm text-muted-foreground font-normal mt-1">{customer.phone} {customer.email && `\u2022 ${customer.email}`}</div>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-4 my-4">
        <div className="bg-muted/30 p-4 rounded-xl border border-border">
          <div className="text-muted-foreground text-sm flex items-center mb-1"><ShoppingBag className="w-4 h-4 mr-1"/> {t.customers.orderCount}</div>
          <div className="text-2xl font-bold">{customer.orderCount}</div>
        </div>
        <div className="bg-muted/30 p-4 rounded-xl border border-border">
          <div className="text-muted-foreground text-sm flex items-center mb-1"><Trophy className="w-4 h-4 mr-1 text-amber-500"/> {t.customers.loyaltyPoints}</div>
          <div className="text-2xl font-bold text-amber-600">{customer.loyaltyPoints}</div>
        </div>
        <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
          <div className="text-primary/80 text-sm flex items-center mb-1">{t.customers.totalSpent}</div>
          <div className="text-2xl font-bold text-primary">{formatCurrency(customer.totalSpent)}</div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">{t.dashboard.recentOrders}</h3>
        <ScrollArea className="max-h-[300px] border rounded-lg">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0">
              <TableRow>
                <TableHead>{t.orders.orderTab}</TableHead>
                <TableHead>{t.orders.time}</TableHead>
                <TableHead>{t.orders.branch}</TableHead>
                <TableHead>{t.orders.payment}</TableHead>
                <TableHead className="text-right">{t.common.total}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customer.recentOrders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t.customers.noCustomers}</TableCell>
                </TableRow>
              ) : (
                customer.recentOrders?.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">#{order.code.slice(-6)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(order.createdAt)}</TableCell>
                    <TableCell>{order.storeName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <DialogFooter className="mt-6">
        <Button onClick={onClose}>{t.common.close}</Button>
      </DialogFooter>
    </>
  );
}

function CustomerForm({ customer, onSuccess }: { customer?: Customer, onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const t = useT();
  
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [email, setEmail] = useState(customer?.email || "");

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({ title: t.common.error, description: t.customers.noCustomers, variant: "destructive" });
      return;
    }

    if (customer) {
      updateCustomer.mutate(
        { id: customer.id, data: { name, phone, email } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
            toast({ title: t.common.success, description: t.customers.customerUpdated });
            onSuccess();
          },
          onError: (err: any) => {
            toast({ title: t.common.error, description: err.message, variant: "destructive" });
          }
        }
      );
    } else {
      createCustomer.mutate(
        { data: { name, phone, email } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
            toast({ title: t.common.success, description: t.customers.customerCreated });
            onSuccess();
          },
          onError: (err: any) => {
            toast({ title: t.common.error, description: err.message, variant: "destructive" });
          }
        }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t.customers.name} <span className="text-destructive">*</span></Label>
        <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Nguyễn Văn A" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">{t.customers.phone} <span className="text-destructive">*</span></Label>
        <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0901234567" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t.customers.email}</Label>
        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nguyenvana@example.com" />
      </div>
      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>{t.common.cancel}</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? t.common.updating : customer ? t.customers.customerUpdated : t.customers.addCustomer}
        </Button>
      </DialogFooter>
    </form>
  );
}
