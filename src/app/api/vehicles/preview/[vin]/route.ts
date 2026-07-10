import { NextRequest, NextResponse } from 'next/server';
import { clearvinPreview } from '@/lib/clearvin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vin: string }> }
) {
  const { vin } = await params;
  const upperVin = vin?.toUpperCase();

  if (!upperVin || upperVin.length !== 17 || !/^[A-HJ-NPR-Z0-9]{17}$/.test(upperVin)) {
    return NextResponse.json({ error: 'Invalid VIN format.' }, { status: 400 });
  }

  try {
    // Try ClearVin preview first (richer data)
    const result = await clearvinPreview(upperVin);
    const spec = result.vinSpec || {};

    // Extract summary counts from ClearVin preview result
    const summaryItems = result.summaryItems || [];
    const getCount = (key: string): number | null => {
      const item = summaryItems.find((s: {name?: string; count?: number; value?: string}) =>
        s.name?.toLowerCase().includes(key.toLowerCase())
      );
      if (!item) return null;
      return item.count ?? (item.value === 'No Records Reported' ? 0 : null);
    };

    return NextResponse.json({
      vin: upperVin,
      make: spec.make || null,
      model: spec.model || null,
      year: spec.year ? parseInt(spec.year) : null,
      trim: spec.trim || null,
      engine: spec.engine || null,
      fuel_type: spec.fuelType || null,
      drive_type: spec.wheelDrive || null,
      body_type: spec.style || null,
      country_of_manufacture: spec.madeIn || null,
      doors: null,
      identifier_type: 'VEHICLE',
      source_country: 'USA',
      recall_count: Array.isArray(result.recalls) ? result.recalls.length : 0,
      preview_image: result.previewImageURL || result.imageURL || result.image || result.photo || result.mainPhoto || result.vehiclePhoto || result.photoUrl || result.previewImage || null,
      auction_records: result.auctionHistoryRecords || 0,
      images_count: result.imagesAmount || 0,
      msrp: spec.msrp || null,
      source: 'clearvin',
      // Summary card counts from ClearVin preview
      ownership_records: getCount('ownership'),
      odometer_reading: result.odometerReading ? `${result.odometerReading} M` : (getCount('odometer') !== null ? `${getCount('odometer')} M` : null),
      title_records: getCount('title history'),
      sale_records: getCount('sale history') ?? (result.auctionHistoryRecords || null),
      junk_salvage_records: getCount('junk'),
      title_brand_records: getCount('title brand'),
      accident_records: getCount('accident'),
      insurance_records: getCount('insurance'),
      lien_records: getCount('lien'),
      // Raw preview data for debugging
      _summary_raw: summaryItems,
    });
  } catch (clearvinError) {
    console.warn('ClearVin preview failed, falling back to NHTSA:', clearvinError);

    // Fallback to NHTSA
    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${upperVin}?format=json`,
        { next: { revalidate: 3600 } }
      );
      const data = await res.json();
      const r = data.Results?.[0];
      if (!r?.Make) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 });

      return NextResponse.json({
        vin: upperVin,
        make: r.Make || null,
        model: r.Model || null,
        year: r.ModelYear ? parseInt(r.ModelYear) : null,
        trim: r.Trim || null,
        engine: r.DisplacementL ? `${parseFloat(r.DisplacementL).toFixed(1)}L` : null,
        fuel_type: r.FuelTypePrimary || null,
        drive_type: r.DriveType || null,
        body_type: r.BodyClass || null,
        country_of_manufacture: r.PlantCountry || null,
        doors: r.Doors ? parseInt(r.Doors) : null,
        recall_count: 0,
        preview_image: null,
        auction_records: 0,
        images_count: 0,
        msrp: null,
        source: 'nhtsa',
      });
    } catch {
      return NextResponse.json({ error: 'Could not retrieve vehicle data.' }, { status: 500 });
    }
  }
}
