import { useListShifts, useCreateShift, useDeleteShift, getListShiftsQueryKey, useListStores, useListStaff } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useStoreId } from "@/lib/store-context";
import { CalendarClock, Plus, Trash2, Clock, MapPin, User as UserIcon } from "lucide-react";
import { formatDate } from "@/lib/format";
import { format, startOfWeek, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/confirm-provider";
import { useT } from "@/lib/i18n-context";

export default function ShiftsPage() {
  const t = useT();
  const { storeId } = useStoreId();
  
  // Weekly view scope
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const fromStr = format(start, 'yyyy-MM-dd');
  const toStr = format(addDays(start, 6), 'yyyy-MM-dd'); // Sunday

  const { data: shifts = [], isLoading } = useListShifts({
    storeId: storeId === 'all' ? undefined : storeId,
    from: fromStr,
    to: toStr
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Generate days array
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

  // Group shifts by date
  const shiftsByDate = shifts.reduce((acc, shift) => {
    if (!acc[shift.date]) acc[shift.date] = [];
    acc[shift.date].push(shift);
    return acc;
  }, {} as Record<string, typeof shifts>);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.shifts.title}</h1>
          <p className="text-muted-foreground mt-1">{t.shifts.subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-muted px-4 py-2 rounded-lg text-sm font-medium border">
            {format(start, 'dd/MM/yyyy')} - {format(addDays(start, 6), 'dd/MM/yyyy')}
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="hover-elevate">
                <Plus className="w-4 h-4 mr-2" /> {t.shifts.addShift}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.shifts.addShift}</DialogTitle>
              </DialogHeader>
              <ShiftForm onSuccess={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground flex-1 flex items-center justify-center">{t.common.loading}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x divide-border flex-1">
            {weekDays.map(date => {
              const dStr = format(date, 'yyyy-MM-dd');
              const dayShifts = shiftsByDate[dStr] || [];
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

              return (
                <div key={dStr} className="flex flex-col h-full min-h-[150px]">
                  <div className={`p-3 text-center border-b border-border/50 ${isToday ? 'bg-primary/10 text-primary font-bold' : 'bg-muted/30 font-medium'}`}>
                    <div className="text-xs uppercase opacity-70 mb-0.5">{format(date, 'EEEE', { locale: vi })}</div>
                    <div className="text-lg">{format(date, 'dd/MM')}</div>
                  </div>
                  <div className="p-2 space-y-2 flex-1 bg-card">
                    {dayShifts.map(shift => (
                      <ShiftCard key={shift.id} shift={shift} />
                    ))}
                    {dayShifts.length === 0 && (
                      <div className="text-center p-4 text-muted-foreground opacity-40 text-sm">{t.orders.empty}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ShiftCard({ shift }: { shift: any }) {
  const t = useT();
  void t;
  const queryClient = useQueryClient();
  const { toast: _toast } = useToast();
  void _toast;
  const confirm = useConfirm();
  const deleteShift = useDeleteShift();

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Xóa ca làm việc?",
      description: `Ca của ${shift.staffName} (${shift.startTime.slice(0,5)} - ${shift.endTime.slice(0,5)}) sẽ bị xóa khỏi lịch.`,
      confirmText: "Xóa ca",
      variant: "destructive",
    });
    if (!ok) return;
    deleteShift.mutate(
      { id: shift.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListShiftsQueryKey() });
        },
      },
    );
  };

  return (
    <div className="bg-background border border-border rounded-lg p-2 text-xs shadow-sm group hover:border-primary/50 relative">
      <div className="font-bold mb-1 text-primary flex items-center gap-1">
        <UserIcon className="w-3 h-3" /> {shift.staffName}
      </div>
      <div className="flex items-center text-muted-foreground mb-1 gap-1">
        <Clock className="w-3 h-3" /> {shift.startTime.slice(0,5)} - {shift.endTime.slice(0,5)}
      </div>
      <div className="flex items-center text-muted-foreground truncate gap-1" title={shift.storeName}>
        <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{shift.storeName}</span>
      </div>
      <button 
        onClick={handleDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function ShiftForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createShift = useCreateShift();
  const { storeId: contextStoreId } = useStoreId();
  
  const { data: stores = [] } = useListStores();
  const { data: staffList = [] } = useListStaff();
  
  const [storeId, setStoreId] = useState(contextStoreId !== 'all' ? contextStoreId : "");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [note, setNote] = useState("");

  const filteredStaff = storeId ? staffList.filter(s => s.storeId === storeId || !s.storeId) : staffList;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !staffId || !date || !startTime || !endTime) {
      toast({ title: t.common.error, description: "Vui lòng nhập đủ thông tin", variant: "destructive" });
      return;
    }

    createShift.mutate(
      { data: { storeId, staffId, date, startTime: `${startTime}:00`, endTime: `${endTime}:00`, note: note || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListShiftsQueryKey() });
          toast({ title: t.common.success, description: t.shifts.shiftCreated });
          onSuccess();
        },
        onError: (err: any) => toast({ title: t.common.error, description: err.message, variant: "destructive" })
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t.shifts.store} <span className="text-destructive">*</span></Label>
        <Select value={storeId} onValueChange={(v) => {setStoreId(v); setStaffId("");}}>
          <SelectTrigger>
            <SelectValue placeholder={`${t.common.search} ${t.shifts.store.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {stores.filter(s => s.isActive).map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t.shifts.staff} <span className="text-destructive">*</span></Label>
        <Select value={staffId} onValueChange={setStaffId} disabled={!storeId}>
          <SelectTrigger>
            <SelectValue placeholder={`${t.common.search} ${t.shifts.staff.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {filteredStaff.filter(s => s.isActive).map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t.expenses.date} <span className="text-destructive">*</span></Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.shifts.startTime} <span className="text-destructive">*</span></Label>
          <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t.shifts.endTime} <span className="text-destructive">*</span></Label>
          <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.orders.noteLabel.replace(":", "")}</Label>
        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Trực quầy bar..." />
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>{t.common.cancel}</Button>
        <Button type="submit" disabled={createShift.isPending}>{t.shifts.addShift}</Button>
      </DialogFooter>
    </form>
  );
}
