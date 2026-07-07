package com.codeWithProject.HotelServer.repository;

import com.codeWithProject.HotelServer.entity.Table;
import com.codeWithProject.HotelServer.enums.TableType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TableRepository extends JpaRepository<Table, Long> {

    List<Table> findByType(TableType type);

    boolean existsByTableNumber(int tableNumber);
}
